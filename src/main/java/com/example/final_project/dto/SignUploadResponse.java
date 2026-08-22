package com.example.final_project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for a minted Supabase Storage signed upload URL. The client
 * PUTs the raw file bytes to signedUrl, then stores publicUrl once the
 * upload succeeds.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignUploadResponse {

    private String signedUrl;
    private String path;
    private String publicUrl;
}
