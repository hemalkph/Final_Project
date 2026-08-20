package com.example.final_project.service;

import com.example.final_project.dto.AuthResponse;
import com.example.final_project.dto.LoginRequest;
import com.example.final_project.dto.RegisterRequest;
import com.example.final_project.model.Role;
import com.example.final_project.model.User;
import com.example.final_project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;

        public AuthResponse register(RegisterRequest request) {
                var user = User.builder()
                                .name(request.getName())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(Role.USER) // Public registration always creates a USER; other roles
                                                 // are only granted via admin actions (seller approval, agent
                                                 // seeding), never from client input.
                                .enabled(true) // Enable user immediately for regular registration
                                .build();
                userRepository.save(user);

                // Generate JWT token for newly registered user
                String jwtToken = jwtService.generateToken(user);

                return AuthResponse.builder()
                                .message("User registered successfully")
                                .token(jwtToken)
                                .role(user.getRole().name())
                                .name(user.getName())
                                .email(user.getEmail())
                                .build();
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));
                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow();

                // Generate real JWT token
                String jwtToken = jwtService.generateToken(user);

                return AuthResponse.builder()
                                .message("Login successful")
                                .token(jwtToken)
                                .role(user.getRole().name())
                                .name(user.getName())
                                .email(user.getEmail())
                                .agentId(user.getAgentId())
                                .build();
        }
}
