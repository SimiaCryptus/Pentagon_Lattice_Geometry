# Run analysis.mac using Maxima


maxima --very-quiet --batch-string="batchload(\"experiment.mac\")$" | grep -v 'rat: replaced' | tee experiment.log
#maxima --very-quiet --batch-string="batchload(\"sweep_ngon.mac\")$" | grep -v 'rat: replaced' | tee sweep_ngon.log