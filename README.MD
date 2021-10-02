sudo docker build . -t yourname/yourburgerbotname

sudo docker save yourname/yourburgerbotname -o ../burgerbotImage
sudo chown user:user ../burgerbotImage

sudo docker run --name burgerbot -d yourname/yourburgerbotname

sudo docker exec -it burgerbot /bin/bash 