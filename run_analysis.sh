# Run analysis.mac using Maxima
set -x
maxima --very-quiet --batch-string="debugmode(true); load(\"analysis.mac\");" 2>&1 | tee analysis.log
maxima --very-quiet --batch-string="debugmode(true); load(\"experiment.mac\");" 2>&1 | tee experiment.log