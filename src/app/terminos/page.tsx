export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Términos y Condiciones</h1>
          <p className="text-sm text-gray-400 mt-1">Taller de Motoimplementos</p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Presupuesto y aprobación</h2>
            <p>
              El presupuesto presentado por el taller tiene una vigencia de <strong>15 días corridos</strong> desde su
              emisión. Transcurrido ese plazo sin respuesta del cliente, el equipo podrá ser devuelto sin realizar la
              reparación.
            </p>
            <p className="mt-2">
              Al aprobar el presupuesto, el cliente autoriza al taller a realizar la reparación descripta y se compromete
              a abonar el monto acordado al momento de retirar el equipo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. Retiro del equipo tras aprobación</h2>
            <p>
              Una vez finalizada la reparación, el taller notificará al cliente. El equipo deberá ser retirado dentro de
              los <strong>15 días corridos</strong> siguientes a dicha notificación.
            </p>
            <p className="mt-2">
              Vencido ese plazo sin retiro, se aplicará un cargo de guarda de <strong>$20.000 por mes o fracción</strong>,
              por un máximo de <strong>6 meses</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Retiro del equipo tras rechazo</h2>
            <p>
              Si el cliente rechaza el presupuesto, deberá retirar el equipo dentro de los <strong>15 días corridos</strong>{' '}
              siguientes a la notificación de rechazo, sin costo alguno.
            </p>
            <p className="mt-2">
              Vencido ese plazo, se aplicará el mismo cargo de guarda de <strong>$20.000 por mes o fracción</strong>,
              con un máximo de <strong>6 meses</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Abandono del equipo</h2>
            <p>
              Transcurridos los <strong>6 meses</strong> desde el vencimiento del plazo de retiro (ya sea por equipo
              finalizado o presupuesto rechazado), sin que el cliente haya retirado el equipo ni abonado los cargos de
              guarda correspondientes, el equipo pasará a ser propiedad del taller. El taller podrá disponer del mismo
              libremente, sin obligación de indemnización al cliente.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Responsabilidad</h2>
            <p>
              El taller no se responsabiliza por daños o pérdidas ocasionados por causas ajenas a la reparación
              contratada, ni por el deterioro natural del equipo durante el período de guarda.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Aceptación</h2>
            <p>
              Al aprobar el presupuesto a través del link enviado por WhatsApp o correo electrónico, el cliente declara
              haber leído, comprendido y aceptado la totalidad de estos términos y condiciones.
            </p>
          </section>

        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center">
          Taller de Motoimplementos · Última actualización: junio 2026
        </div>

      </div>
    </div>
  )
}
