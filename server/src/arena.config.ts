import Arena from '@colyseus/arena';
import { monitor } from '@colyseus/monitor';
import axios from 'axios';
import { RedisPresence } from 'colyseus';
import { ApiService } from './api';
(BigInt as any).prototype['toJSON'] = function () {
  return this.toString();
};

/**
 * Import your Room files
 */
import { MyRoom } from './rooms/MyRoom';
export default Arena({
  getId: () => 'Your Colyseus App',
  initializeGameServer: async (gameServer) => {
    /**
     * Define your room handlers:
     */
    const apiService = new ApiService();
    const rooms = await apiService.getRooms();
    console.log('ROOMS _', rooms.length);

    rooms.forEach((r) => {
      gameServer.define(r.name, MyRoom, r as any);
    });
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get('/', (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/tools/monitor/
     */
    app.use('/colyseus', monitor());
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
