# How to Run (DEV) — EZ Tax Form Backend

This project is configured to run with an in-memory **H2** database for quick local testing (profile: `dev`).
You can still use PostgreSQL by running without the dev profile, as configured in `src/main/resources/application.properties`.

## Prerequisites
- JDK 21+ (Spring Boot 3.5)
- Gradle Wrapper (already included): `./gradlew` (macOS/Linux) or `gradlew.bat` (Windows)

## Run with H2 (recommended for quick start)
### Windows (PowerShell or CMD)
```
cd taxform
gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

### macOS/Linux
```
cd taxform
./gradlew bootRun --args='--spring.profiles.active=dev'
```

- App starts at: `http://localhost:8080`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:eztaxdb`)

## Run with PostgreSQL (existing config)
- Update credentials inside `src/main/resources/application.properties`
- Then simply run:
```
# Windows
gradlew.bat bootRun

# macOS/Linux
./gradlew bootRun
```

## Build JAR
```
# Windows
gradlew.bat clean build

# macOS/Linux
./gradlew clean build
```
The packaged jar will be in `build/libs/`.
