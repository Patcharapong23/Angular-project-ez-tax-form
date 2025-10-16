package com.ez.taxform.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "business_info")
public class BusinessInfo {

    @Id
    @GeneratedValue
    @Column(name = "business_id")
    private UUID businessId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String logoImg;
    private String tenantNameTh;
    private String tenantNameEn;
    private String tenantTaxId;
    private String branchCode;
    private String branchNameTh;
    private String branchNameEn;
    private String tenantTel;
    private String buildingNo;
    private String addressDetailTh;
    private String province;
    private String district;
    private String subdistrict;
    private String zipCode;
    private String addressDetailEn;

    // getters & setters
    public UUID getBusinessId() {
        return businessId;
    }

    public void setBusinessId(UUID businessId) {
        this.businessId = businessId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getLogoImg() {
        return logoImg;
    }

    public void setLogoImg(String logoImg) {
        this.logoImg = logoImg;
    }

    public String getTenantNameTh() {
        return tenantNameTh;
    }

    public void setTenantNameTh(String tenantNameTh) {
        this.tenantNameTh = tenantNameTh;
    }

    public String getTenantNameEn() {
        return tenantNameEn;
    }

    public void setTenantNameEn(String tenantNameEn) {
        this.tenantNameEn = tenantNameEn;
    }

    public String getTenantTaxId() {
        return tenantTaxId;
    }

    public void setTenantTaxId(String tenantTaxId) {
        this.tenantTaxId = tenantTaxId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchNameTh() {
        return branchNameTh;
    }

    public void setBranchNameTh(String branchNameTh) {
        this.branchNameTh = branchNameTh;
    }

    public String getBranchNameEn() {
        return branchNameEn;
    }

    public void setBranchNameEn(String branchNameEn) {
        this.branchNameEn = branchNameEn;
    }

    public String getTenantTel() {
        return tenantTel;
    }

    public void setTenantTel(String tenantTel) {
        this.tenantTel = tenantTel;
    }

    public String getBuildingNo() {
        return buildingNo;
    }

    public void setBuildingNo(String buildingNo) {
        this.buildingNo = buildingNo;
    }

    public String getAddressDetailTh() {
        return addressDetailTh;
    }

    public void setAddressDetailTh(String addressDetailTh) {
        this.addressDetailTh = addressDetailTh;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getSubdistrict() {
        return subdistrict;
    }

    public void setSubdistrict(String subdistrict) {
        this.subdistrict = subdistrict;
    }

    public String getZipCode() {
        return zipCode;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    public String getAddressDetailEn() {
        return addressDetailEn;
    }

    public void setAddressDetailEn(String addressDetailEn) {
        this.addressDetailEn = addressDetailEn;
    }
}
