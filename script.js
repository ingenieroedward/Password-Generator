//Boton
document.getElementById('generar').addEventListener('click', () => generar());

function generar() {
    //cambiamos icono copiar
    document.getElementById('icono').setAttribute('class', "bi bi-clipboard icono-copiar");
    //rango
    let numero = document.getElementById('numero').textContent;
    //Llamamos a la funcion fortaleza
    fortaleza();
    //Obtenemos los valor segun los checkbox activos
    let valores_string = valores();
    //generar contraseñas
    var contraseña = "";
    for (let index = 0; index < numero; index++) {
        let random = Math.floor(Math.random() * valores_string.length);
        contraseña += valores_string[random];
    }
    document.getElementById('contraseña').value = contraseña;
}
//funcion fortaleza
function fortaleza() {
    //inpust checkbox
    let checkboxs = document.querySelectorAll('.checkbox');
    //validar checkbox activos
    var cont = 0;
    checkboxs.forEach(checkbox => checkbox.checked ? cont = cont + 1 : cont = cont + 0);

    //fortaleza de contraseña
    let div_nivels = document.querySelectorAll('.nivel');
    div_nivels.forEach(nivel => nivel.setAttribute('class', 'nivel'));
    switch (cont) {
        case 1:
            div_nivels[0].setAttribute('class', 'nivel muybajo');
            document.getElementById('modo').textContent = "MUY BAJO";
            break;
        case 2:
            div_nivels[0].setAttribute('class', 'nivel bajo');
            div_nivels[1].setAttribute('class', 'nivel bajo');
            document.getElementById('modo').textContent = "BAJO";
            break;
        case 3:
            div_nivels[0].setAttribute('class', 'nivel medio');
            div_nivels[1].setAttribute('class', 'nivel medio');
            div_nivels[2].setAttribute('class', 'nivel medio');
            document.getElementById('modo').textContent = "MEDIO";
            break;
        case 4:
            div_nivels[0].setAttribute('class', 'nivel alto');
            div_nivels[1].setAttribute('class', 'nivel alto');
            div_nivels[2].setAttribute('class', 'nivel alto');
            div_nivels[3].setAttribute('class', 'nivel alto');
            document.getElementById('modo').textContent = "ALTO";
            break;
        default: alert('Seleccione al menos una casilla');
            location.reload();
            break;
    }
}
//caracteres
let caracteres = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+'
};
//funcion valores
function valores() {
    var valores = "";
    if (document.getElementById('mayusculas').checked) {
        valores += caracteres.uppercase;
    }
    if (document.getElementById('minusculas').checked) {
        valores += caracteres.lowercase;
    }
    if (document.getElementById('numeros').checked) {
        valores += caracteres.numbers;
    }
    if (document.getElementById('simbolos').checked) {
        valores += caracteres.symbols;
    }
    return valores;
}

//Copiado
function copiarAlPortapapeles(id_elemento) {
    var aux = document.createElement("input");
    aux.setAttribute("value", document.getElementById(id_elemento).value);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);

    //cambiamos el icono ah compidado
    document.getElementById('icono').setAttribute('class', "bi bi-clipboard-check icono-copiar");
}