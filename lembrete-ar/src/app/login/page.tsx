export default function Login({ searchParams }: { searchParams: { erro?: string } }) {
  const dev = process.env.AUTH_DEV_LOGIN === "true";
  return (
    <div className="center">
      <h1>Seu cliente esquece de voltar.<br />Faca ele voltar sozinho.</h1>
      {dev ? (
        <form method="POST" action="/api/auth/dev-login" className="card">
          <p className="muted">Login de desenvolvimento. Em producao: Google ou link magico (Auth.js / Better Auth).</p>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required placeholder="voce@empresa.com" />
          {searchParams.erro && <p className="err">E-mail invalido.</p>}
          <button className="btn" type="submit">Entrar</button>
        </form>
      ) : (
        <div className="card"><p>Login por Google / link magico: a implementar (semana 1).</p></div>
      )}
    </div>
  );
}
