# Run analysis.mac using Maxima


maxima --very-quiet --batch-string="batchload(\"sweep_ngon.mac\")$" | tee sweep_ngon.log