compactar_dia()
{
  ARQUIVO=./log/legado_$1.log
  if [ -f $ARQUIVO ]; then
    echo $ARQUIVO
    xz $ARQUIVO
  fi
}

compactar_dia `date --date="-29 day" +"%Y-%m-%d"`
compactar_dia `date --date="-28 day" +"%Y-%m-%d"`
compactar_dia `date --date="-27 day" +"%Y-%m-%d"`
compactar_dia `date --date="-26 day" +"%Y-%m-%d"`
compactar_dia `date --date="-25 day" +"%Y-%m-%d"`
compactar_dia `date --date="-24 day" +"%Y-%m-%d"`
compactar_dia `date --date="-23 day" +"%Y-%m-%d"`
compactar_dia `date --date="-22 day" +"%Y-%m-%d"`
compactar_dia `date --date="-21 day" +"%Y-%m-%d"`
compactar_dia `date --date="-20 day" +"%Y-%m-%d"`
compactar_dia `date --date="-19 day" +"%Y-%m-%d"`
compactar_dia `date --date="-18 day" +"%Y-%m-%d"`
compactar_dia `date --date="-17 day" +"%Y-%m-%d"`
compactar_dia `date --date="-16 day" +"%Y-%m-%d"`
compactar_dia `date --date="-15 day" +"%Y-%m-%d"`
compactar_dia `date --date="-14 day" +"%Y-%m-%d"`
compactar_dia `date --date="-13 day" +"%Y-%m-%d"`
compactar_dia `date --date="-12 day" +"%Y-%m-%d"`
compactar_dia `date --date="-11 day" +"%Y-%m-%d"`
compactar_dia `date --date="-10 day" +"%Y-%m-%d"`
compactar_dia `date --date="-09 day" +"%Y-%m-%d"`
compactar_dia `date --date="-08 day" +"%Y-%m-%d"`
compactar_dia `date --date="-07 day" +"%Y-%m-%d"`
compactar_dia `date --date="-06 day" +"%Y-%m-%d"`
compactar_dia `date --date="-05 day" +"%Y-%m-%d"`
