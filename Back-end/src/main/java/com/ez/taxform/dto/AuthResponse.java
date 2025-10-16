package com.ez.taxform.dto;

public class AuthResponse {
    private String token;
    private boolean mustChangePassword;

    public AuthResponse() {
    }

    public AuthResponse(String token, boolean mustChangePassword) {
        this.token = token;
        this.mustChangePassword = mustChangePassword;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }
}
