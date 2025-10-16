package com.ez.taxform.config; // แพ็กเกจถูกต้องตามที่คุณสร้าง

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * คลาสสำหรับตั้งค่ากลางของ Web Application
 * ในที่นี้เราจะใช้เพื่อกำหนดค่า CORS (Cross-Origin Resource Sharing) ทั้งหมด
 */
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    /**
     * กำหนดค่า CORS policy ให้กับแอปพลิเคชันทั้งหมด
     * @param registry ตัวช่วยในการลงทะเบียน CORS mappings
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // ใช้กฎนี้กับทุก URL ที่ขึ้นต้นด้วย /api/
                
                // อนุญาตให้ request ที่มาจาก Angular App (ที่รันบน port 4200) เข้ามาได้
                .allowedOrigins("http://localhost:4200") 
                
                // อนุญาต HTTP methods เหล่านี้
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                
                // อนุญาตให้ส่ง Header อะไรมาก็ได้
                .allowedHeaders("*") 
                
                // อนุญาตให้ส่งข้อมูลยืนยันตัวตน (เช่น Token ใน Header)
                .allowCredentials(true);
    }
}
