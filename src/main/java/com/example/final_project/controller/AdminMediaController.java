package com.example.final_project.controller;

import com.example.final_project.dto.SignUploadRequest;
import com.example.final_project.dto.SignUploadResponse;
import com.example.final_project.service.SupabaseStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only media upload support. Mints Supabase Storage signed upload
 * URLs so the browser can upload directly to Storage without ever holding
 * the service role key. Sits under /api/admin/** (hasRole('ADMIN') in
 * SecurityConfig), so no security config change was needed for this.
 */
@RestController
@RequestMapping("/api/admin/media")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMediaController {

    private final SupabaseStorageService supabaseStorageService;

    @PostMapping("/sign-upload")
    public ResponseEntity<SignUploadResponse> signUpload(@Valid @RequestBody SignUploadRequest request) {
        return ResponseEntity.ok(supabaseStorageService.createSignedUploadUrl(request));
    }
}
