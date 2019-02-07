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
    }

    stages {
        stage('Construire image docker') {
            steps {
                sh """
                    docker build . \
                    --tag ${DOCKER_REPOSITORY}/${IMAGE_NAME}:latest \
                    --no-cache --rm
                """
            }
        }

        stage('Publier image docker dans le repo') {
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

            deleteDir()
        }
    }
}
