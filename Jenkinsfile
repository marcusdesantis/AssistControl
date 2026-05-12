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
        sh """
          DB=\$(grep '^DATABASE_URL=' ${ROOT}/attendance-nextjs/.env | head -1 | cut -d= -f2-)
          docker run --rm \\
            --add-host=host.docker.internal:host-gateway \\
            -v ${ROOT}/attendance-nextjs:/app \\
            -w /app/packages/shared \\
            -e "DATABASE_URL=\$DB" \\
            node:20-alpine \\
            sh -c 'npm install -g prisma@5.22.0 --quiet 2>/dev/null && prisma db push --schema=prisma/schema.prisma'
        """
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
