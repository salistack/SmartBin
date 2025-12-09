# IDE Setup for Spring Boot (VS Code)

This document explains how to set up your development environment on Windows (PowerShell) for Spring Boot development using Visual Studio Code.

## 1) Install a JDK
- Spring Boot projects commonly use Java 17 or 21. Install an LTS JDK (Temurin/Adoptium recommended).

PowerShell (optional, using `winget`):

```powershell
# Install Temurin JDK 17 (adjust to 11/21 if needed)
winget install --id Eclipse.Adoptium.Temurin.17 -e --silent
```

If `winget` is not available, download and install from: https://adoptium.net/ or use your preferred JDK vendor.

After install, confirm Java is available:

```powershell
java -version
javac -version
```

If VS Code can't find the JDK, set `JAVA_HOME` in Windows system settings or in PowerShell profile:

```powershell
setx JAVA_HOME "C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.x"
```

Open a new terminal after `setx` to pick up the change.

## 2) Install VS Code extensions
Recommended extensions are added to `.vscode/extensions.json` in this repo. Install manually or via CLI.

PowerShell (optional):

```powershell
# Example installs (may prompt to sign in or require latest `code` CLI on PATH)
code --install-extension vscjava.vscode-java-pack
code --install-extension vscjava.vscode-spring-boot
code --install-extension vscjava.vscode-maven
code --install-extension vscjava.vscode-java-debug
code --install-extension redhat.vscode-yaml
code --install-extension gabrielbb.vscode-lombok
```

If `code` isn't on PATH, open VS Code, press `Ctrl+Shift+P` -> `Shell Command: Install 'code' command in PATH` (or use the Windows installer option).

## 3) Open your Spring Boot project
- Open the project root in VS Code.
- If the project uses Maven or Gradle, VS Code will detect and import the project (you may be prompted to import the Maven/Gradle project and download dependencies).

## 4) Run and debug
- Use the Spring Boot Dashboard (provided by Spring extensions) to run apps, or
- Use Maven/Gradle tasks (from the `Terminal -> Run Task...` menu) to run `mvn spring-boot:run` or `./gradlew bootRun`.

If you'd like, I can add `.vscode/launch.json` and `.vscode/tasks.json` to this repo with templates for Maven and Gradle — tell me whether you use Maven or Gradle.

## 5) Lombok support
- If your project uses Lombok, install the Lombok extension and ensure the Lombok jar is on the classpath (Maven/Gradle manages this). You may also need to enable annotation processing in some build tools.

## 6) Useful tips
- Enable auto-imports and organize imports in Java settings.
- Use the Java Projects and Spring Boot panels in VS Code to manage runs and beans.
- If you need to customize the JDK used by VS Code, configure `java.configuration.runtimes` in `.vscode/settings.json`.

## 7) Next steps (I can do these for you)
- Add `.vscode/launch.json` and `.vscode/tasks.json` templates for running/debugging (Maven and/or Gradle).
- Scaffold a minimal Spring Boot sample project in this repo.
- Configure `java.configuration.runtimes` with your installed JDK path.

Tell me which of the "Next steps" you'd like me to proceed with, and whether this project uses Maven or Gradle.
