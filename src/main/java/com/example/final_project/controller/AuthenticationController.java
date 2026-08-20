package com.example.final_project.controller;

import com.example.final_project.dto.AuthResponse;
import com.example.final_project.dto.LoginRequest;
import com.example.final_project.dto.RegisterRequest;
import com.example.final_project.service.AuthenticationService;
import com.example.final_project.service.LoginRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService service;
    private final LoginRateLimiter loginRateLimiter;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        // Uses getRemoteAddr(), not X-Forwarded-For: this app isn't deployed
        // behind a reverse proxy, so a client-supplied header would let an
        // attacker fake a new IP on every request and bypass the limiter
        // entirely. If a proxy is added later, this needs to read the header
        // from a trusted proxy hop instead.
        if (!loginRateLimiter.tryAcquire(httpRequest.getRemoteAddr())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many login attempts. Please try again in a minute."));
        }
        return ResponseEntity.ok(service.login(request));
    }
}
