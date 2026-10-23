import Link from 'next/link';

export const metadata = { title: 'Privacidad — Lodge Market' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 md:py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Política de privacidad</h1>
        <p className="text-sm text-muted-foreground">Última actualización: 06/05/2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Quién gestiona Lodge Market</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Lodge Market es un mercado privado creado para los residentes de una residencia de estudiantes.
          Lo gestiona el administrador de la residencia (Ian) en beneficio de sus residentes y no es un
          servicio comercial. La plataforma no procesa pagos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Qué datos recopilamos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Cuenta: correo electrónico, contraseña cifrada y nombre visible.</li>
          <li>Perfil: foto, presentación y número de habitación (visible para otros residentes registrados).</li>
          <li>Anuncios: título, descripción, categoría, estado, precio y fotos.</li>
          <li>Mensajes: el texto de las conversaciones que mantienes con otros residentes.</li>
          <li>
            Moderación: reportes enviados, bloqueos y valoraciones dadas y recibidas.
          </li>
          <li>
            Datos técnicos: metadatos habituales de las peticiones web (IP y agente de usuario),
            tratados por nuestro proveedor de alojamiento para prevenir abusos.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Quién puede ver tus datos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Otros residentes registrados pueden ver tu perfil público (nombre visible, foto,
            presentación y valoración media) y tus anuncios publicados.
          </li>
          <li>
            La otra persona de una conversación puede ver los mensajes enviados en ella. Estos
            mensajes nunca se muestran al resto de residentes.
          </li>
          <li>
            <strong className="text-foreground">
              Los administradores pueden leer mensajes, anuncios y reportes para moderar la plataforma.
            </strong>{' '}
            Solo lo harán al investigar un reporte o aplicar las normas.
          </li>
          <li>Tu número de habitación, correo y contraseña nunca aparecen en tu perfil público.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Dónde se almacenan tus datos</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Los datos se almacenan en InsForge, un backend Postgres gestionado y alojado en la Unión
          Europea (eu-central). Las conexiones se cifran en tránsito (HTTPS/TLS) y los discos del
          proveedor se cifran en reposo. Las fotos se guardan en el mismo proveedor, en espacios
          con control de acceso.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Durante cuánto tiempo los conservamos</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Conservamos tus datos mientras tu cuenta esté activa. Al eliminarla, desactivamos tu perfil:
          el nombre se sustituye por &ldquo;Usuario eliminado&rdquo;, se borran la foto, la presentación
          y la habitación, y se ocultan tus anuncios. Los mensajes anteriores siguen visibles para la
          otra persona, pero aparecen enviados por &ldquo;Usuario eliminado&rdquo;, ya que borrarlos
          eliminaría también su copia de la conversación. Puedes solicitar la eliminación completa de
          tus mensajes anteriores contactando con el administrador.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Tus derechos según el RGPD</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Como residente en la UE, tienes derecho a acceder, rectificar, eliminar, limitar y portar
          tus datos, así como a oponerte a su tratamiento. Puedes ejercer estos derechos con las
          herramientas de edición del perfil, el botón &ldquo;Eliminar mi cuenta&rdquo; de Ajustes o
          contactando directamente con el administrador.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Base jurídica</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tratamos tus datos sobre la base de tu consentimiento (art. 6.1.a del RGPD) al registrarte
          y del interés legítimo (art. 6.1.f del RGPD) para moderar, prevenir abusos y mantener segura
          la comunidad de la residencia.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Contacto</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Para cualquier consulta sobre privacidad o para ejercer tus derechos, contacta con el
          administrador de la residencia en persona o por correo electrónico.
        </p>
      </section>

      <div className="pt-4">
        <Link
          href="/login"
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
