@echo off
echo Construyendo frontend local...

docker rm -f aiattendance-frontend 2>nul

docker build --add-host=host.docker.internal:host-gateway -t aiattendance-frontend-local -f Dockerfile.local .

docker run -d --name aiattendance-frontend --add-host=host.docker.internal:host-gateway -p 3000:80 aiattendance-frontend-local

echo Listo! Abre http://localhost:3000
