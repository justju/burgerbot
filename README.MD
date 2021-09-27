sudo docker build . -t yourname/yourburgerbotname

sudo docker save yourname/yourburgerbotname -o ../yourburgerbotname
sudo chown user:user ../yourburgerbotname 

sudo docker run --name burgerbot -d yourname/yourburgerbotname

sudo docker exec -it burgerbot /bin/bash 