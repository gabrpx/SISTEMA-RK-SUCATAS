import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/usuarios', {
      nome: 'Teste Cliente',
      telefone: '123456789',
      cargo: 'cliente',
      senha: 'test_password'
    });
    console.log("Success:", res.data);
  } catch (err: any) {
    if (err.response) {
      console.error("Error Status:", err.response.status);
      console.error("Error Data:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}
test();
