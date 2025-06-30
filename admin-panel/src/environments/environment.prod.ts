export const environment = {
  production: true,
  apiUrl: '/api',  // relative path → works behind Nginx
  socketUrl: ''  // Use same origin as frontend (let Nginx handle proxy)
};
