const es_noticia_actual = (fecha_publicacion, horas_limite = 72) => {
    const limite = new Date(Date.now() - horas_limite * 60 * 60 * 1000);
    return new Date(fecha_publicacion) >= limite;
};
console.log(es_noticia_actual("Thu, 23 Jul 2026 10:20:00 GMT"));
