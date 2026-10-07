'use client';
export default function ErrorPage({reset}){return <div className="container error-page"><h1>Precisamos tentar de novo.</h1><p>Não foi possível carregar as informações agora. Tente novamente em alguns instantes.</p><button className="button" onClick={reset}>Tentar novamente</button></div>;}
