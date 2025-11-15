import datetime
import time
import os

os.system('cls' if os.name == 'nt' else 'clear')
def data_para_timestamp(dia, mes, ano, em_milisegundos=False):
    dt = datetime.datetime(ano, mes, dia)
    ts_segundos = int(time.mktime(dt.timetuple()))
    if em_milisegundos:
        return ts_segundos * 1000
    return ts_segundos

def timestamp_para_data(timestamp):
    """
    Aceita timestamp em segundos OU em milissegundos.
    Detecta automaticamente: se for maior que 1e11, assume milissegundos.
    Retorna string no formato DD/MM/YYYY e objeto datetime.
    """
    try:
        ts = int(float(timestamp))
    except Exception:
        raise ValueError("Timestamp inválido. Forneça um número (segundos ou milissegundos).")

    # Se o número parecer estar em milissegundos (> ~1e11), converte para segundos
    if abs(ts) > 1e11:
        ts = ts // 1000

    dt = datetime.datetime.fromtimestamp(ts)  # usa timezone local
    return dt.strftime("%d/%m/%Y"), dt

def ler_int(prompt):
    while True:
        v = input(prompt).strip()
        try:
            return int(v)
        except ValueError:
            print("Entrada inválida. Digite um número inteiro.")

print("O que deseja fazer?")
print("1 - Converter DATA em TIMESTAMP")
print("2 - Converter TIMESTAMP em DATA")

opc = input("Escolha (1 ou 2): ").strip()

if opc == "1":
    dia = ler_int("Digite o dia: ")
    mes = ler_int("Digite o mês: ")
    ano = ler_int("Digite o ano: ")
    escolha_ms = input("Quer o resultado em milissegundos? (s/N): ").strip().lower() == "s"
    try:
        ts = data_para_timestamp(dia, mes, ano, em_milisegundos=escolha_ms)
        print()
        print(f"Timestamp: {ts}")
    except Exception as e:
        print("Erro ao converter data:", e)

elif opc == "2":
    raw = input("Digite o timestamp (segundos ou milissegundos): ").strip()
    try:
        data_str, dt_obj = timestamp_para_data(raw)
        # mostrar também o timestamp em segundos e em ms
        ts_input = int(float(raw))
        ts_seg = ts_input if abs(ts_input) <= 1e11 else ts_input // 1000
        ts_ms = ts_seg * 1000
        print()
        print(f"Data: {data_str}")
        print(f"Timestamp (segundos): {ts_seg}")
        print(f"Timestamp (milissegundos): {ts_ms}")
    except Exception as e:
        print("Erro:", e)
else:
    print("Opção inválida.")
