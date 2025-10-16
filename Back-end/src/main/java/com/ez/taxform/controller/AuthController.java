package com.ez.taxform.controller;

import com.ez.taxform.dto.AuthRequest;
import com.ez.taxform.dto.AuthResponse;
import com.ez.taxform.dto.RegisterRequestDto;
import com.ez.taxform.model.BusinessInfo;
import com.ez.taxform.model.User;
import com.ez.taxform.repository.BusinessInfoRepository;
import com.ez.taxform.service.AuthService;
import com.ez.taxform.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private UserDetailsService userDetailsService;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private AuthService authService;
    @Autowired
    private BusinessInfoRepository businessInfoRepository;

    @PostMapping(value = "/register", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Map<String, Object>> registerUser(@RequestBody RegisterRequestDto req) {
        String email = req.getEmail();
        String userName = (email != null && email.contains("@")) ? email.substring(0, email.indexOf('@')) : email;

        User u = new User();
        u.setUsername(userName);
        u.setPassword(userName); // password เริ่มต้น = userName
        u.setEmail(email);
        u.setFullName(req.getFirstName());
        u.setMustChangePassword(true);

        User saved = authService.register(u);

        BusinessInfo b = new BusinessInfo();
        b.setUser(saved);
        b.setLogoImg(req.getLogoImg());
        b.setTenantNameTh(req.getTenantNameTh());
        b.setTenantNameEn(req.getTenantNameEn());
        b.setTenantTaxId(req.getTenantTaxId());
        b.setBranchCode(req.getBranchCode());
        b.setBranchNameTh(req.getBranchNameTh());
        b.setBranchNameEn(req.getBranchNameEn());
        b.setTenantTel(req.getTenantTel());
        b.setBuildingNo(req.getBuildingNo());
        b.setAddressDetailTh(req.getAddressDetailTh());
        b.setProvince(req.getProvince());
        b.setDistrict(req.getDistrict());
        b.setSubdistrict(req.getSubdistrict());
        b.setZipCode(req.getZipCode());
        b.setAddressDetailEn(req.getAddressDetailEn());
        businessInfoRepository.save(b);

        Map<String, Object> body = new HashMap<>();
        body.put("id", saved.getUserId());
        body.put("userName", saved.getUsername());
        body.put("email", saved.getEmail());
        body.put("firstName", req.getFirstName());
        body.put("mustChangePassword", true);
        return ResponseEntity.ok(body);
    }

    @PostMapping(value = "/login", consumes = "application/json", produces = "application/json")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest auth) throws Exception {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(auth.getUsername(), auth.getPassword()));
        } catch (BadCredentialsException e) {
            throw new Exception("Incorrect username or password", e);
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(auth.getUsername());
        final String jwt = jwtUtil.generateToken(userDetails);

        // โหลด user เพื่อดู mustChangePassword
        // (กรณีคุณมี UserRepository ก็โหลดมาเช็คได้)
        boolean mustChange = false;
        if (userDetails instanceof org.springframework.security.core.userdetails.User) {
            // ถ้าต้องการ ควร query จาก DB จริง ๆ
            // ข้ามรายละเอียด, ปล่อย false ไว้ หรือเพิ่ม repository มาตรวจ
        }

        return ResponseEntity.ok(new AuthResponse(jwt, mustChange));
    }
}
