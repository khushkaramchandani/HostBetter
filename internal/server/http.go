package server

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"t.hostbetter.live/internal/config"
	"t.hostbetter.live/internal/subdomain"
	"t.hostbetter.live/internal/tunnel"
)

const warningHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Warning — HostBetter Tunnel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #f59e0b;
            border-radius: 12px; padding: 40px; max-width: 500px; width: 90%%; }
    .icon { font-size: 2.5rem; margin-bottom: 16px; }
    h1 { color: #f59e0b; font-size: 1.4rem; margin-bottom: 12px; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 12px; }
    .domain { color: #f8fafc; font-weight: 600; font-family: monospace;
              background: #0f172a; padding: 2px 8px; border-radius: 4px; }
    .btn { display: inline-block; margin-top: 20px; padding: 12px 28px;
           background: #3b82f6; color: white; border-radius: 8px;
           text-decoration: none; font-weight: 600; }
    .btn:hover { background: #2563eb; }
    .brand { margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155;
             color: #475569; font-size: 0.8rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>You are leaving HostBetter Tunnel</h1>
    <p>You are about to view content hosted on a developer tunnel:</p>
    <p><span class="domain">%s</span></p>
    <p>This content is <strong>not hosted, reviewed, or endorsed</strong>
    by HostBetter Tunnel. Only continue if you trust whoever sent you this link.</p>
    <a class="btn" href="?proceed=1">I understand, continue →</a>
    <div class="brand">HostBetter Tunnel — Instant public URLs via SSH</div>
  </div>
</body>
</html>`

var errResponseTooLarge = errors.New("response body too large")

// ServeHTTP implements http.Handler for HTTPS requests
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	setSecurityHeaders(w)

	// Enforce request body size limit
	if r.ContentLength > config.MaxRequestBodySize {
		http.Error(w, "Request Entity Too Large", http.StatusRequestEntityTooLarge)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, config.MaxRequestBodySize)

	host := strings.ToLower(stripPort(r.Host))
	domain := strings.ToLower(s.domain)

	if !strings.HasSuffix(host, "."+domain) {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	sub := strings.TrimSuffix(host, "."+domain)

	if !subdomain.IsValid(sub) {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	tun := s.GetTunnel(sub)
	if tun == nil {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}

	if !tun.AllowRequest() {
		// Record violation and kill tunnel + block SSH client IP if too many violations
		if tun.RecordRateLimitHit() {
			log.Printf("Tunnel %s killed due to rate limit abuse, blocking SSH client %s", sub, tun.ClientIP)
			s.BlockIP(tun.ClientIP)
			tun.CloseSSH()
		}
		w.Header().Set("Retry-After", "1")
		http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
		return
	}

	tun.Touch()
	s.IncrementRequests()

	// Show interstitial warning for browser requests
	if isBrowserRequest(r) &&
		r.Header.Get("tunnl-skip-browser-warning") == "" &&
		!hasWarningCookie(r, sub) {
		s.redirectToWarningPage(w, r, sub)
		return
	}

	if isWebSocketRequest(r) {
		s.handleWebSocket(w, r, tun, sub)
		return
	}

	requestStart := time.Now()
	sw := &statusCaptureWriter{ResponseWriter: w}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = tun.Listener.Addr().String()
			req.Host = r.Host
		},
		Transport: tun.Transport(),
		ModifyResponse: func(resp *http.Response) error {
			// Enforce response body size limit
			if resp.ContentLength > config.MaxResponseBodySize {
				return fmt.Errorf("%w: %d bytes (max %d)", errResponseTooLarge, resp.ContentLength, config.MaxResponseBodySize)
			}
			// Wrap body with size limiter for chunked/unknown-length responses
			resp.Body = &limitedReadCloser{
				rc:    resp.Body,
				limit: config.MaxResponseBodySize,
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("Proxy error for %s: %v", sub, err)
			if errors.Is(err, errResponseTooLarge) {
				http.Error(w, "Response Too Large", http.StatusBadGateway)
				return
			}
			http.Error(w, "Bad Gateway", http.StatusBadGateway)
		},
	}

	proxy.ServeHTTP(sw, r)

	if logger := tun.Logger(); logger != nil {
		logger.LogRequest(r.Method, r.URL.Path, sw.status, time.Since(requestStart))
	}
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request, tun *tunnel.Tunnel, sub string) {
	backendConn, err := net.DialTimeout("tcp", tun.Listener.Addr().String(), 10*time.Second)
	if err != nil {
		log.Printf("WebSocket backend dial error for %s: %v", sub, err)
		http.Error(w, "Bad Gateway", http.StatusBadGateway)
		return
	}
	defer backendConn.Close()

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		log.Printf("WebSocket hijack not supported for %s", sub)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		// After Hijack() is called (even on failure), ResponseWriter may be invalid
		// Just log the error and return - the connection will be closed
		log.Printf("WebSocket hijack error for %s: %v", sub, err)
		return
	}
	defer clientConn.Close()

	if err := r.Write(backendConn); err != nil {
		log.Printf("WebSocket request write error for %s: %v", sub, err)
		return
	}

	logger := tun.Logger()
	wsPath := r.URL.Path
	wsStart := time.Now()
	if logger != nil {
		logger.LogWebSocketOpen(wsPath)
	}

	// Copy data bidirectionally with limits
	var backendBytes, clientBytes int64
	done := make(chan struct{})
	go func() {
		backendBytes, _ = copyWithLimits(backendConn, clientConn, config.MaxWebSocketTransfer, config.WebSocketIdleTimeout)
		// Signal backend we're done sending
		if tc, ok := backendConn.(*net.TCPConn); ok {
			tc.CloseWrite()
		}
	}()
	go func() {
		defer close(done)
		clientBytes, _ = copyWithLimits(clientConn, backendConn, config.MaxWebSocketTransfer, config.WebSocketIdleTimeout)
	}()
	<-done

	if logger != nil {
		logger.LogWebSocketClose(wsPath, time.Since(wsStart), backendBytes+clientBytes)
	}
}

// copyWithLimits copies from src to dst with a byte transfer limit and idle timeout.
// It resets the read deadline on src after each successful read.
// Returns the number of bytes written and any error.
func copyWithLimits(dst, src net.Conn, maxBytes int64, idleTimeout time.Duration) (int64, error) {
	buf := make([]byte, 32*1024)
	var written int64
	for {
		src.SetReadDeadline(time.Now().Add(idleTimeout))
		n, readErr := src.Read(buf)
		if n > 0 {
			written += int64(n)
			if written > maxBytes {
				return written, fmt.Errorf("transfer limit exceeded")
			}
			dst.SetWriteDeadline(time.Now().Add(idleTimeout))
			if _, writeErr := dst.Write(buf[:n]); writeErr != nil {
				return written, writeErr
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				return written, nil
			}
			return written, readErr
		}
	}
}

func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("X-XSS-Protection", "1; mode=block")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
}

func isBrowserRequest(r *http.Request) bool {
	ua := strings.ToLower(r.Header.Get("User-Agent"))
	browserKeywords := []string{"mozilla", "chrome", "safari", "firefox", "edge", "opera"}
	for _, kw := range browserKeywords {
		if strings.Contains(ua, kw) {
			return true
		}
	}
	return false
}

func hasWarningCookie(r *http.Request, sub string) bool {
	cookie, err := r.Cookie(config.WarningCookieName + "_" + sub)
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(cookie.Value), []byte("1")) == 1
}

func (s *Server) redirectToWarningPage(w http.ResponseWriter, r *http.Request, sub string) {
	originalURL := "https://" + r.Host + r.URL.RequestURI()
	cookie := &http.Cookie{
		Name:     config.WarningCookieName + "_" + sub,
		Value:    "1",
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}

	if r.URL.Query().Get("proceed") == "1" {
		http.SetCookie(w, cookie)
		http.Redirect(w, r, originalURL, http.StatusFound)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, warningHTML, r.Host)
}

func isWebSocketRequest(r *http.Request) bool {
	return strings.EqualFold(r.Header.Get("Upgrade"), "websocket") &&
		strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade")
}

// stripPort removes the port from a host string (e.g., "example.com:443" -> "example.com")
func stripPort(host string) string {
	if h, _, err := net.SplitHostPort(host); err == nil {
		return h
	}
	if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		return strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
	}
	if strings.Count(host, ":") == 1 {
		idx := strings.LastIndex(host, ":")
		return host[:idx]
	}
	return host
}

// limitedReadCloser wraps an io.ReadCloser and limits the number of bytes read
type limitedReadCloser struct {
	rc    io.ReadCloser
	limit int64
	read  int64
}

func (l *limitedReadCloser) Read(p []byte) (n int, err error) {
	if len(p) == 0 {
		return 0, nil
	}
	if l.read >= l.limit {
		var probe [1]byte
		n, err := l.rc.Read(probe[:])
		if n > 0 {
			l.read += int64(n)
			return 0, fmt.Errorf("%w (exceeded %d bytes)", errResponseTooLarge, l.limit)
		}
		return 0, err
	}
	remaining := l.limit - l.read
	if int64(len(p)) > remaining {
		p = p[:remaining]
	}
	n, err = l.rc.Read(p)
	l.read += int64(n)
	return n, err
}

func (l *limitedReadCloser) Close() error {
	return l.rc.Close()
}

// statusCaptureWriter wraps http.ResponseWriter to capture the status code.
type statusCaptureWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (w *statusCaptureWriter) WriteHeader(code int) {
	if w.wroteHeader {
		return
	}
	w.status = code
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusCaptureWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.status = http.StatusOK
		w.wroteHeader = true
	}
	return w.ResponseWriter.Write(b)
}

// Unwrap returns the underlying ResponseWriter for interface passthrough (e.g., http.Flusher).
func (w *statusCaptureWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

// HTTPRedirectHandler returns an http.Handler that redirects HTTP to HTTPS
func (s *Server) HTTPRedirectHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := strings.ToLower(stripPort(r.Host))
		domain := strings.ToLower(s.domain)
		if !strings.HasSuffix(host, "."+domain) && host != domain {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		target := "https://" + r.Host + r.URL.RequestURI()
		http.Redirect(w, r, target, http.StatusMovedPermanently)
	})
}
