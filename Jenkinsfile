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
            DB=$(grep '^DATABASE_URL=' ../.env | head -1 | cut -d= -f2-)
            DB_LOCAL=$(echo "$DB" | sed 's|host.docker.internal|127.0.0.1|g')
            echo "=== Aplicando schema ==="
            DATABASE_URL="$DB_LOCAL" npx prisma db push --skip-generate
            echo "=== Migracion completada ==="
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
