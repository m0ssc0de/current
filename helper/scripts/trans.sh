set -eux

trimAndSort () {
  DATA_FILE=$1
  HEADER_PREFIX=$2
  SORT_COL=$3
  DATA_DIR=$4
  FILE=$DATA_DIR/$DATA_FILE
  h=`head -n 1 $FILE`
  if [ ${h:0:${#HEADER_PREFIX}} == $HEADER_PREFIX ]; then
    tail -n +2 $FILE > $FILE.tailp2
  else
    mv $FILE $FILE.tailp2
  fi
  sort -k ${SORT_COL}n -t "," $FILE.tailp2 -o $FILE
  rm $FILE.tailp2
}

array=()
find . -type d -print0 >tmpfile
while IFS=  read -r -d $'\0'; do
    array+=("$REPLY")
done <tmpfile
rm -f tmpfile

for d in ${array[@]}; do
  if [ $d != "." ]; then
    trimAndSort blocks.csv "number," 1 $d
    trimAndSort contracts.csv "address," 6 $d
    trimAndSort logs.csv "log_index," 5 $d
    trimAndSort receipts.csv "transaction_hash," 4 $d
    trimAndSort token_transfers.csv "token_address," 7 $d
    trimAndSort transactions.csv "hash," 4 $d
    trimAndSort tokens.csv "address," 4 $d
  fi
done
