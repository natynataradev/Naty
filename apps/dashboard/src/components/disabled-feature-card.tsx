export function DisabledFeatureCard() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="glass-card max-w-md rounded-[2.5rem] p-10 text-center animate-fadeIn">
        <h1 className="text-lg font-bold text-white">Función con costo</h1>
        <p className="mt-3 text-sm text-gray-400">
          Esta es una función con costo y actualmente está desactivada.
        </p>
      </div>
    </div>
  );
}
