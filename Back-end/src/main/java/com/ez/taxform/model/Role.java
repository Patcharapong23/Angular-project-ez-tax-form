package com.ez.taxform.model;

import jakarta.persistence.*;
import java.sql.Timestamp;
import java.util.UUID;

@Entity
@Table(name = "role")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID roleId;
    private String roleName;
    private String roleLevel;
    private String sellerId;
    private char enableFlag;
    private Timestamp createDate;

    // Getters and Setters
}