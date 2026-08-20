package com.example.final_project.controller;

import com.example.final_project.model.Property;
import com.example.final_project.model.PropertyStatus;
import com.example.final_project.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for seller property listing submissions.
 * Properties submitted through this endpoint start with PENDING status.
 */
@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final PropertyService propertyService;

    /**
     * Submit a new property listing.
     * Sets status to PENDING for admin review.
     */
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> submitListing(@RequestBody Property property) {
        // Set status to PENDING for admin review
        property.setStatus(PropertyStatus.PENDING);

        Property savedProperty = propertyService.createProperty(property);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Your listing has been submitted and is pending review.",
                "propertyId", savedProperty.getId()));
    }
}
