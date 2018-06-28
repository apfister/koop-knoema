// clean shutdown on `cntrl + c`
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const Koop = require('koop');
const koop = new Koop();

const provider = require('./');
koop.register(provider);

const port = process.env.PORT || 3000;

koop.server.listen(port, (err) => {
  if (err) {
    console.log(err);
  }

  const message = `

  Now listening on ${port}
  For more docs visit: https://koopjs.github.io/docs/specs/provider/

  Press control + c to exit
  `;

  console.log(message);
});
