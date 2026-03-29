window.ERP = window.ERP || {};
ERP.state = { empresaId:null, usuario:null, moduloActual:null };

ERP.initApp = async function(modulo){
  ERP.state.moduloActual = modulo;
  const { data:{session} } = await db.auth.getSession();
  if(!session){ window.location.href='login.html'; return; }
  ERP.state.usuario = session.user;
  if(ERP.initLayout){ await ERP.initLayout(modulo); }
};

ERP.getEmpresa = ()=>ERP.state.empresaId;
ERP.setEmpresa = (id)=>ERP.state.empresaId=id;
