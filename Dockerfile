FROM quay.io/qasimtech/mega-bot:latest

WORKDIR /root/mega-md

RUN git clone https://github.com/GlobalTechInfo/MEGA-MD . && \
    npm install

EXPOSE 5000

CMD ["npm", "start"]
