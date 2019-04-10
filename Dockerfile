FROM trzeci/emscripten
ADD ./ /APP 
RUN /bin/mkdir /DATA
WORKDIR /DATA
CMD ["/bin/sh","/APP/walua.sh","docker_make"]
