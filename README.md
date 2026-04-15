# myndware-auto

Processo de automação de coleta e criação de termos (documentos) da plataforma low-code [myndware](https://myndware.com/).

> Esse script utiliza Bun, não NodeJS.

## Proposito

Myndware é uma plataforma feita para utilização de empresas que lidam com diversos documentos e processos claros bem definidos para permitir a criação e arquivamento dos mesmos documentos no mesmo processo.

Por exemplo, após entrar no link da sua empresa que contratou o serviço da myndware e logar no site, pode existir um processo chamado "Termo de Responsabilidade", após clicar nele o site vai criar uma instancia desse processo e te enviar para uma página com vários campos onde você precisa preencher os dados e a partir desse momento você pode salva-lo, anexar arquivos a ele (PDF, PNG, DOCX...), remover arquivos e mais.

Você pode criar a quantidade que quiser de processos e definir uma "rotina" na plataforma, talvez você queira transformar cada instancia de projeto em um arquivo backup que exporta sozinho para o onedrive, ou criar uma database de unidades e motoristas para ter uma lista simples selecionavel na hora de criar um processo/instancia de notas fiscais.

Os exemplos acima são alguns dos propositos que forneciam a necessidade que a empresa tinha, porém tudo isso ainda era extremamente manual, a plataforma cria uma forma fácil de fazer, ver e analisar o trabalho, mas não reduz o trabalho necessário ate certo ponto, então criei esse script para eventualmente deixar cada parte do meu trabalho mais leve.

## Utilização

> [!WARNING]
> Esse código é antigo, desatualizado e não recebe manutenção, requer acesso a plataforma myndware e não vai funcionar de nenhuma outra forma.
>
> Todo código e função mencionado deve ser visto dentro de src/index.js

### Configurações Necessárias

- Configurar o arquivo `.env` com **CLOUD_LOGIN** e **CLOUD_PASSWORD**.
- Dentro do `src/index.js`, configurar o Objeto **documentType** com os IDs das Bases e URLs.
- Ler o resto do arquivo `src/index.js` para alterar links e strings para o nome da sua empresa com o dominio myndware. Adicionei comentários com a tag "Warning" avisando onde necessário.

### Funções

O script é feito para ser utilizando no console, tendo diversos prompts para selecionar a ação que quer tomar.

> Pergunta: O que deseja fazer?

Resposta:

1. Cadastrar Motorista
2. Cadastrar Base
3. Coletar Termos (Não é uma opção vísivel)
4. Criar Termo (Não implementado)
5. Clonar Termo (Não implementado)

A primeira e a segunda opção ambas vão te perguntar em qual unidade cadastrar, as opção são baseadas nas chaves dentro do Objeto **documentType.register_driver** e **documentType.register_base**

Após selecionar uma opção, o script vai abrir uma janela do navegador e navegar para o dominio da sua empresa na myndware, tentar logar e então iniciar a ação selecionada.

### AÇÃO: Cadastro de Unidade Motorista

Essa ação executa a função *registerDocument*, em resumo a função faz o navegador aberto entrar na página de criação de documentos, seleciona a criação de motorista ou unidade e utiliza os dados fornecidos por você para criar oque foi requisitado.

### AÇÃO: Coleta de Termos

> Para executar essa função, é necessário remover o comentário da chamada na função *storeTerms* no final do arquivo e comentar qualquer outra chamada das funções próximas (**registerDocument** e **cloneTerm**), depois disso execute o script e selecione/digite qualquer coisa para ele começar o processo.

Essa ação executa a função **storeTerms**, em resumo a função faz o navegador aberta entrar na página de processos criados e começa fazer uma varredura de todo contéudo listado nela.

Após entrar na página de processos criados, o script vai criar outra questão no console perguntando se deve "Verificar anexos em cada termo?", o proposito vai ser explicado mais abaixo.

O script assume que a página tem vários elementos `<div>` com a `class=email-info-task-card-content`, espera-se que o div tenha a seguinte estrutura:

```HTML
<div class="email-info task-card-content">
  <!-- children[0] -->
  <div>
    <!-- children[0].children[0] -->
    <div>
      <div>
        <div>
          <a href="https://exemplo.com">Link</a>
        </div>
      </div>
    </div>

    <!-- children[0].children[1] -->
    <div>01/01/2024</div>

    <!-- children[0].children[3] -->
    <div></div>
    <div>Há 2 dias</div>
  </div>

  <!-- children[1] -->
  <div>
    <div>
      <div>SUBCOMPANY1 - Texto Exemplo</div>
      <div></div>
      <div>ID123</div>
    </div>
  </div>

  <!-- children[2] até children[28] -->
  <div></div> <!-- 2 -->
  <div></div> <!-- 3 -->
  <div>Owner Nome</div> <!-- 4 -->
  <div></div> <!-- 5 -->
  <div></div> <!-- 6 -->
  <div>000.000.000-00</div> <!-- 7 -->
  <div></div> <!-- 8 -->
  <div></div> <!-- 9 -->
  <div>Equipamento X</div> <!-- 10 -->
  <div></div> <!-- 11 -->
  <div></div> <!-- 12 -->
  <div>Modelo Y</div> <!-- 13 -->
  <div></div> <!-- 14 -->
  <div></div> <!-- 15 -->
  <div>Número Série</div> <!-- 16 -->
  <div></div> <!-- 17 -->
  <div></div> <!-- 18 -->
  <div>Seguido por Z</div> <!-- 19 -->
  <div></div> <!-- 20 -->
  <div></div> <!-- 21 -->
  <div>Cidade Exemplo</div> <!-- 22 -->
  <div></div> <!-- 23 -->
  <div></div> <!-- 24 -->
  <div>02/01/2024</div> <!-- 25 -->
  <div></div> <!-- 26 -->
  <div></div> <!-- 27 -->
  <div>Projeto ABC</div> <!-- 28 -->
</div>
```

O script coleta todas essas informações de cada div, analisa se algo crucial está faltando (ex, Termo sem Data, Pessoa ou CPF). Caso você tenha selecionado sim na pergunta de verificar anexos, ele vai abrir a página do div (oque esperasse que seja a página de uma instancia do processo do termo) e verifique se tem documentos anexados à instancia do processo e coloque as informações contidas nesse documento.

Uma nota importante e que antes de começar a coleta o script calcula a quantidade de instancias do processo na página e separa cada 100 elementos em uma tarefa, e então executa funções para analisar diversos elementos de forma paralela, cada 100 elementos analisados são armazenados em um arquivo json dentro da pasta `src` com o final do nome diferente baseado no index da tarefa. No final de tudo é criado um arquivo **termos_local.json** com todos os dados coletados.

Exemplo de um elemento coletado:

```JSON
{
    "terms": [
        {
            "date": "10/02/2025 17:41",
            "dateTimeSince": "21 horas atrás",
            "id": "000000-2025",
            "owner": {
                "name": "NOME DE UMA PESSOA",
                "cpf": "000.000.000-00"
            },
            "equipment": {
                "name": "NOTEBOOK MARCA",
                "sn": "NÚMERO DE SERIE",
                "model": "MODELODONOTEBOOK",
                "followedBy": "MOUSE E TECLADO"
            },
            "city": "RIO DE JANEIRO",
            "dateIndex": "10/02/2025",
            "project": "000 - ALGUMLUGAR",
            "url": "https://myndware.io/organization/COMPANY/task/letrasenumeros/process/letrasenumeros",
            "documentsAttached": [
                {
                    "name": "DOCUMENTO.pdf",
                    "submittedBy": "VOCE",
                    "documentDate": "10/02/2025",
                    "documentCreationDate": "10/02/2025",
                    "documentType": "RECEBIMENTO"
                }
            ]
        }
    ]
}
```