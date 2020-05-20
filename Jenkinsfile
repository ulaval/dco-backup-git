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
        DOCKER_REPOSITORY = "docker-local.maven.ulaval.ca"
        DOCKER_REPOSITORY_URL = "https://${params.DOCKER_REGISTRY_HOST}/v2"
        DOCKER_REGISTRY_CREDS_ID = "docker"
        DOCKER_IMAGE_TAG = "${DOCKER_REPOSITORY}/dco/dco-backup-git:latest"

        // Solves: https://stackoverflow.com/questions/42743201/npm-install-fails-in-jenkins-pipeline-in-docker/42957034
        npm_config_cache = 'npm-cache'
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
                sh "npm run build"
                sh "npm run test"
            }
        }

        stage('docker build') {
            steps {
                sh """docker build . --tag ${DOCKER_IMAGE_TAG} --no-cache --rm"""
            }
        }

        stage('docker push') {
            steps {
                withDockerRegistry(url: DOCKER_REPOSITORY_URL, credentialsId: DOCKER_REGISTRY_CREDS_ID) {
                    sh "docker push ${DOCKER_IMAGE_TAG}"
                }
            }
        }
    }

    post {
        always {
            // Cleaning up docker images
            sh "docker rmi ${DOCKER_IMAGE_TAG}"
        }

        unstable {
            emailext (to: 'frederic.poliquin@dti.ulaval.ca',
                subject: "Build of ${env.JOB_NAME}[${env.BUILD_NUMBER}] is unstable :(",
                body: "<p><a href=\"${env.BUILD_URL}\">${env.JOB_NAME} [${env.BUILD_NUMBER}]</a></p>",
                recipientProviders: [[$class: 'DevelopersRecipientProvider']])
        }

        failure {
            emailext (to: 'frederic.poliquin@dti.ulaval.ca',
                subject: "Build of ${env.JOB_NAME}[${env.BUILD_NUMBER}] failed :(",
                body: "<p><a href=\"${env.BUILD_URL}\">${env.JOB_NAME} [${env.BUILD_NUMBER}]</a></p>",
                recipientProviders: [[$class: 'DevelopersRecipientProvider']])
        }
    }
}
