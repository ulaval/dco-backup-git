#!/usr/bin/env groovy

pipeline {
    agent any

    options {
        timestamps()

        buildDiscarder(
            logRotator(daysToKeepStr: '7')
        )
    }

    environment {
        DOCKER_REPOSITORY = 'docker-local.maven.ulaval.ca/ena2'
        DOCKER_REPOSITORY_URL = 'https://docker-local.maven.ulaval.ca/v2'
        IMAGE_NAME = 'dti-backup-git'
        npm_config_cache = 'npm-cache' // Solves: https://stackoverflow.com/questions/42743201/npm-install-fails-in-jenkins-pipeline-in-docker/42957034
    }

    stages {
        stage('build + tests') {
            agent {
                docker {
                    image 'node:8.15.0-alpine'
                    reuseNode true
                }
            }
            steps {
                sh "npm ci"
                sh "npm run test"
                sh "npm run build"
            }
        }

        stage('docker build') {
            steps {
                sh """
                    docker build . \
                    --tag ${DOCKER_REPOSITORY}/${IMAGE_NAME}:latest \
                    --no-cache --rm
                """
            }
        }

        stage('docker push') {
            steps {
                withDockerRegistry(url: DOCKER_REPOSITORY_URL, credentialsId: 'artifactory-docker-registry-credentials') {
                    sh "docker push ${DOCKER_REPOSITORY}/${IMAGE_NAME}:latest"
                }
            }
        }
    }

    post {
        always {
            envoyerNotifications currentBuild.result

            supprimerImageDocker nom: "${DOCKER_REPOSITORY}/${IMAGE_NAME}:latest"
        }
    }
}
