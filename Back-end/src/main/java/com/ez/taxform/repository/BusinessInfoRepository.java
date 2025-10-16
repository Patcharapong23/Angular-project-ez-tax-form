package com.ez.taxform.repository;

import com.ez.taxform.model.BusinessInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BusinessInfoRepository extends JpaRepository<BusinessInfo, UUID> {
}
