package com.ez.taxform.service;

import com.ez.taxform.model.User;
import com.ez.taxform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public User register(User toSave) {
        if (userRepository.existsByUsername(toSave.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        // encode password
        toSave.setPassword(passwordEncoder.encode(toSave.getPassword()));
        // mustChangePassword ควร true ตั้งแต่แรก (ตั้งไว้ที่ entity แล้ว)
        return userRepository.save(toSave);
    }
}
