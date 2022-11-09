FROM node:18.9-alpine3.16
RUN npm i -g zx &&\
apk add py3-pip gcc musl-dev &&\
pip3 install ethereum-etl
COPY ./run.mjs /run.mjs
COPY ./export_token_transfers.py /usr/lib/python3.10/site-packages/ethereumetl/cli/extract_token_transfers.py
WORKDIR /workdir
CMD /usr/local/bin/zx /run.mjs
# yesq/google_zx