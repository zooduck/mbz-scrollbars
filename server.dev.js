import { SimpleServer } from '@zooduck/simple-server';

const server = new SimpleServer({ staticPath: 'playground' });

server.start();
