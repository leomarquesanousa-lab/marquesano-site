import MetaAdsSection from '../meta-ads-section';
import { redirect, notFound } from 'next/navigation';
import { currentAdmin, requireAdmin } from '../../server/admin/session';
import { modules, canAccess, configured } from '../../server/admin/core.mjs';
import { AdminShell, LoginForm } from '../ui';
import styles from '../admin.module.css';
import Operations, { PaymentsPage, SalesPage, UsersPage } from '../operations';

export default async function AdminPage({ params }) {
  const path = (await params).path || [];
  if (path.length === 1 && path[0] === 'login') {
    if (await currentAdmin()) redirect('/admin/dashboard');
    return <main className={styles.login}><section className={styles.loginCard}>
      <span className={styles.brand}>Marquesano <b>Admin</b></span>
      <h1>Acesso privado</h1><p>Entre com sua conta administrativa.</p>
      <LoginForm available={configured()}/>
      <small>Acesso exclusivo para usuários autorizados.</small>
    </section></main>;
  }
  const module = path[0] || 'dashboard';
  const { user, allowed } = await requireAdmin(module);
  if (!path.length) redirect('/admin/dashboard');
  if (module === 'meta-ads' && (path.length > 3 || (path[1] && !['campanhas','conjuntos','anuncios','nova','assistente','criativos','conversoes','historico'].includes(path[1])) || (path[2] && (path[1] !== 'campanhas' || !/^\d+$/.test(path[2]))))) notFound();
  if (module !== 'meta-ads' && (path.length > 2 || !Object.hasOwn(modules, module) || (path.length===2&&!['leads','clientes','campanhas','vendas'].includes(module)))) notFound();
  const navigation=['dashboard','meta-ads','vendas','analytics','marketing','seo','configuracoes','usuarios','auditoria'];
  const links = navigation.filter(key => canAccess(user.role,key)).map(key => ({ href: `/admin/${key}`, title: modules[key].title }));
  const descriptions={dashboard:'Acompanhe o alcance e os resultados do seu site.',analytics:'Entenda quem chega, de onde vem e o que faz no seu site.',marketing:'Sua central de mídia paga e resultados.',seo:'Saúde técnica e presença na pesquisa do Google.',configuracoes:'Gerencie as conexões do seu site.',usuarios:'Organize sua equipe e seus acessos.',auditoria:'Acompanhe as alterações no ambiente administrativo.'};
  return <AdminShell user={user} links={links}>
    {allowed ? <><div className={styles.pageHeading}><span className={styles.eyebrow}>MARQUESANO / ADMIN</span><h1>{module==='dashboard'?'Visão geral':modules[module].title}</h1><p>{descriptions[module]||modules[module].description}</p></div>
      {module==='meta-ads'?<MetaAdsSection path={path.slice(1)}/>:module==='pagamentos' ? <PaymentsPage/> : module==='vendas'?<SalesPage recordId={path[1]||null}/>:module==='usuarios'?<UsersPage user={user}/>:<Operations module={module} user={user} recordId={path[1]||null}/>}
    </> : <><h1>Acesso restrito</h1><p>Sua conta não tem permissão para acessar este módulo.</p></>}
  </AdminShell>;
}
