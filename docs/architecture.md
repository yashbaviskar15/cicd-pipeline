# Project Architecture

## Overview
This is a complete CI/CD pipeline demonstration project using Docker, GitHub Actions, and AWS.

## Architecture Diagram
```mermaid
flowchart TD
    A[Developer] -->|git push| B[GitHub]
    B -->|Trigger| C[GitHub Actions CI]
    C -->|Build & Test| D[Docker Images]
    D -->|Push to| E[Amazon ECR]
    B -->|Trigger| F[AWS CodePipeline]
    F --> G[CodeBuild]
    G --> H[CodeDeploy]
    H -->|Blue/Green| I[Amazon ECS]
    I --> J[Application Load Balancer]
    J --> K[End Users]
    L[CloudWatch] -->|Monitor| I
    L -->|Trigger Rollback| H
```

## Tech Stack
| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express |
| Frontend | Static HTML + Nginx |
| Containerization | Docker |
| Infrastructure as Code | Terraform |
| CI | GitHub Actions |
| Image Registry | Amazon ECR |
| Orchestration | Amazon ECS (Fargate) |
| Deployment | AWS CodeDeploy (Blue/Green) |
| Pipeline | AWS CodePipeline |
| Monitoring | Amazon CloudWatch |

## Key Features
1. **Automated CI/CD Pipeline
2. **Blue/Green Deployments
3. **Infrastructure as Code
4. **Monitoring & Observability
5. **Secrets Management
6. **Auto-Rollback on Failures
