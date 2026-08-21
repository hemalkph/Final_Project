package com.example.final_project.repository;

import com.example.final_project.model.HouseType;
import com.example.final_project.model.Property;
import com.example.final_project.model.PropertyStatus;
import com.example.final_project.model.PropertyType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByType(PropertyType type);

    List<Property> findByStatus(PropertyStatus status);

    List<Property> findByPriceLessThanEqual(java.math.BigDecimal price);

    List<Property> findByAddressContainingIgnoreCase(String address);

    List<Property> findByTitleContainingIgnoreCaseOrAddressContainingIgnoreCase(String title, String address);

    long countByStatus(PropertyStatus status);

    List<Property> findByOwnerEmail(String ownerEmail);

    /**
     * Server-side search for the public browse page: all params optional,
     * matching client-side applyFilters() in properties.html (title/address/
     * description keyword, exact type, exact houseType).
     */
    // CAST(:q AS string) everywhere :q appears: when q is null, Hibernate
    // can't infer a concrete type for the bind parameter from a bare NULL
    // used inside CONCAT()/LOWER(), and ends up binding it in a way Postgres
    // resolves to bytea — "function lower(bytea) does not exist". An
    // explicit cast forces an unambiguous text type regardless of value.
    @Query("SELECT p FROM Property p WHERE " +
            "(CAST(:q AS string) IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
            "OR LOWER(p.address) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
            "OR LOWER(p.description) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))) AND " +
            "(:type IS NULL OR p.type = :type) AND " +
            "(:houseType IS NULL OR p.houseType = :houseType)")
    List<Property> search(@Param("q") String q, @Param("type") PropertyType type,
            @Param("houseType") HouseType houseType);
}
