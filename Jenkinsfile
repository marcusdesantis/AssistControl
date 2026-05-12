pipeline {
  agent any
  environment {
    ROOT = '/root/proyectos/opt/attendance-ia'
  }
  stages {
    stage('Pull') {
      steps {
        sshagent(['github-ssh']) {
          dir("${ROOT}") {
            sh 'git pull origin main'
          }
        }
      }
    }
    stage('Migrar DB') {
      steps {
        dir("${ROOT}/attendance-nextjs/packages/shared") {
          sh '''
            export $(grep -E "^DATABASE_URL=" /root/proyectos/opt/attendance-ia/attendance-nextjs/.env | head -1)
            npx prisma@5.22.0 db push
          '''
        }
      }
    }
    stage('Deploy Backend') {
      steps {
        dir("${ROOT}/attendance-nextjs") {
          sh 'docker compose down && docker compose up -d --build'
        }
      }
    }
    stage('Deploy Frontend') {
      steps {
        dir("${ROOT}/attendance-frontend") {
          sh 'docker build --add-host=host.docker.internal:host-gateway -t aiattendance-frontend .'
          sh 'docker stop aiattendance-frontend || true'
          sh 'docker rm aiattendance-frontend || true'
          sh 'docker run -d --name aiattendance-frontend --add-host=host.docker.internal:host-gateway -p 80:80 -p 443:443 -v /etc/letsencrypt:/etc/letsencrypt:ro aiattendance-frontend'
        }
      }
    }
  }
  post {
    success { echo '✅ Deploy completado correctamente' }
    failure { echo '❌ Deploy falló' }
  }
}
