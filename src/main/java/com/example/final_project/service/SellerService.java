package com.example.final_project.service;

import com.example.final_project.dto.SellerActivateDTO;
import com.example.final_project.dto.SellerApplyDTO;
import com.example.final_project.model.ActivationToken;
import com.example.final_project.model.Role;
import com.example.final_project.model.SellerApplication;
import com.example.final_project.model.User;
import com.example.final_project.repository.ActivationTokenRepository;
import com.example.final_project.repository.SellerApplicationRepository;
import com.example.final_project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final ActivationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.base-url}")
    private String appBaseUrl;

    public SellerApplication apply(SellerApplyDTO dto) {
        if (applicationRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Application with this email already exists");
        }
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }

        SellerApplication app = SellerApplication.builder()
                .fullName(dto.getFullName())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .cityOrDistrict(dto.getCityOrDistrict())
                .nicOrCompanyRegNo(dto.getNicOrCompanyRegNo())
                .status(SellerApplication.ApplicationStatus.PENDING)
                .build();

        return applicationRepository.save(app);
    }

    public List<SellerApplication> getAllPendingApplications() {
        return applicationRepository.findByStatus(SellerApplication.ApplicationStatus.PENDING);
    }

    public SellerApplication getApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    @Transactional
    public void approveApplication(Long applicationId) {
        SellerApplication app = getApplication(applicationId);
        if (app.getStatus() != SellerApplication.ApplicationStatus.PENDING) {
            throw new RuntimeException("Application is not in PENDING state");
        }

        // 1. Create disabled User
        User user = User.builder()
                .name(app.getFullName())
                .email(app.getEmail())
                .password("") // No password initially
                .role(Role.SELLER)
                .enabled(false)
                .build();
        userRepository.save(user);

        // 2. Create Activation Token
        String tokenString = UUID.randomUUID().toString();
        ActivationToken token = ActivationToken.builder()
                .token(tokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .used(false)
                .build();
        tokenRepository.save(token);

        // 3. Update Application Status
        app.setStatus(SellerApplication.ApplicationStatus.APPROVED);
        applicationRepository.save(app);

        // 4. Send Email
        String activationLink = appBaseUrl + "/seller/activate.html?token=" + tokenString;
        String emailBody = "<h3>Application Approved!</h3>" +
                "<p>Congratulations, your seller account application has been approved.</p>" +
                "<p>Please click the link below to set your password and activate your account:</p>" +
                "<a href=\"" + activationLink + "\">Set Password & Activate</a>" +
                "<p>This link expires in 24 hours.</p>";

        emailService.sendEmail(app.getEmail(), "Activate Your Seller Account", emailBody);
    }

    @Transactional
    public void rejectApplication(Long applicationId, String note) {
        SellerApplication app = getApplication(applicationId);
        app.setStatus(SellerApplication.ApplicationStatus.REJECTED);
        app.setAdminNote(note);
        applicationRepository.save(app);

        // Optional: Send rejection email
        emailService.sendEmail(app.getEmail(), "Seller Application Update",
                "<p>Your application was rejected. Reason: " + note + "</p>");
    }

    @Transactional
    public void activateAccount(SellerActivateDTO dto) {
        ActivationToken token = tokenRepository.findByToken(dto.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid token"));

        if (token.isUsed()) {
            throw new RuntimeException("Token already used");
        }
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token expired");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEnabled(true);
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }

    @Transactional
    public void resendActivation(Long applicationId) {
        SellerApplication app = getApplication(applicationId);
        if (app.getStatus() != SellerApplication.ApplicationStatus.APPROVED) {
            throw new RuntimeException("Application must be APPROVED to resend activation");
        }

        User user = userRepository.findByEmail(app.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found for this application"));

        if (user.isEnabled()) {
            throw new RuntimeException("User is already active");
        }

        // Create new token
        String tokenString = UUID.randomUUID().toString();
        ActivationToken token = ActivationToken.builder()
                .token(tokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .used(false)
                .build();
        tokenRepository.save(token);

        // Send Email
        String activationLink = appBaseUrl + "/seller-activate.html?token=" + tokenString;
        String emailBody = "<h3>Activate Your Account</h3>" +
                "<p>Please click the link below to set your password and activate your account:</p>" +
                "<a href=\"" + activationLink + "\">Set Password & Activate</a>" +
                "<p>This link expires in 24 hours.</p>";

        emailService.sendEmail(app.getEmail(), "Activate Your Seller Account (Resend)", emailBody);
    }

    @Transactional
    public java.util.List<java.util.Map<String, String>> ensurePreGeneratedSellers() {
        // The 5 demo credentials follow a fixed, documented pattern, so they're
        // built in-memory here rather than persisted anywhere in plaintext.
        java.util.List<java.util.Map<String, String>> credentials = new java.util.ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            String email = "seller" + i + "@example.com";
            String rawPassword = "Seller" + i + "@123";
            String name = "Pre-Generated Seller " + i;

            ensureSellerExists(name, email, rawPassword);

            java.util.Map<String, String> map = new java.util.HashMap<>();
            map.put("username", email);
            map.put("password", rawPassword);
            credentials.add(map);
        }
        return credentials;
    }

    @Transactional
    public void createManualSeller(String username, String password) {
        if (userRepository.findByEmail(username).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }
        ensureSellerExists("Manual Seller", username, password);
    }

    private void ensureSellerExists(String name, String email, String rawPassword) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(rawPassword))
                    .role(Role.SELLER)
                    .enabled(true)
                    .build();
            userRepository.save(user);
        }
    }
}
