#!/bin/bash

# Script para optimizar PDFs para web
# Uso: ./optimize-pdf.sh input.pdf [output.pdf]

if [ $# -eq 0 ]; then
    echo "Error: Debes proporcionar un archivo PDF de entrada"
    echo "Uso: $0 input.pdf [output.pdf]"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE%.*}_optimized.pdf}"

# Verificar que el archivo existe
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: El archivo '$INPUT_FILE' no existe"
    exit 1
fi

echo "🔄 Optimizando PDF para web..."
echo "📁 Archivo de entrada: $INPUT_FILE"
echo "📁 Archivo de salida: $OUTPUT_FILE"

# Optimizar PDF con Ghostscript
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE \
   -dQUIET \
   -dBATCH \
   -dColorImageResolution=150 \
   -dGrayImageResolution=150 \
   -dMonoImageResolution=150 \
   -sOutputFile="$OUTPUT_FILE" \
   "$INPUT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ PDF optimizado exitosamente: $OUTPUT_FILE"
    
    # Función portable para obtener tamaño de archivo
    get_file_size() {
        local file="$1"
        if [ -f "$file" ]; then
            # Intentar stat BSD (macOS)
            stat -f%z "$file" 2>/dev/null || \
            # Intentar stat GNU (Linux)
            stat -c%s "$file" 2>/dev/null || \
            # Fallback usando wc -c
            wc -c < "$file" 2>/dev/null || \
            echo "0"
        else
            echo "0"
        fi
    }
    
    # Función portable para calcular MB
    bytes_to_mb() {
        local bytes="$1"
        if [ "$bytes" -eq 0 ]; then
            echo "0.00"
        elif command -v awk >/dev/null 2>&1; then
            echo "$bytes" | awk '{printf "%.2f", $1/1024/1024}'
        elif command -v bc >/dev/null 2>&1; then
            echo "scale=2; $bytes / 1024 / 1024" | bc
        elif command -v python3 >/dev/null 2>&1; then
            python3 -c "print(f'{$bytes/1024/1024:.2f}')"
        else
            # Fallback básico con división entera
            mb=$((bytes / 1048576))
            echo "$mb.00"
        fi
    }
    
    # Obtener tamaños
    INPUT_SIZE=$(get_file_size "$INPUT_FILE")
    OUTPUT_SIZE=$(get_file_size "$OUTPUT_FILE")
    
    if [ "$INPUT_SIZE" -gt 0 ] && [ "$OUTPUT_SIZE" -gt 0 ]; then
        INPUT_MB=$(bytes_to_mb "$INPUT_SIZE")
        OUTPUT_MB=$(bytes_to_mb "$OUTPUT_SIZE")
        
        echo "📊 Tamaño original: ${INPUT_MB} MB"
        echo "📊 Tamaño optimizado: ${OUTPUT_MB} MB"
        
        # Calcular reducción porcentual de forma portable
        if [ "$INPUT_SIZE" -gt "$OUTPUT_SIZE" ]; then
            DIFF=$((INPUT_SIZE - OUTPUT_SIZE))
            if command -v awk >/dev/null 2>&1; then
                REDUCTION=$(echo "$DIFF $INPUT_SIZE" | awk '{printf "%.1f", ($1 * 100) / $2}')
            elif command -v bc >/dev/null 2>&1; then
                REDUCTION=$(echo "scale=1; ($DIFF * 100) / $INPUT_SIZE" | bc)
            elif command -v python3 >/dev/null 2>&1; then
                REDUCTION=$(python3 -c "print(f'{($DIFF * 100) / $INPUT_SIZE:.1f}')")
            else
                REDUCTION=$((DIFF * 100 / INPUT_SIZE))
            fi
            echo "🎯 Reducción: ${REDUCTION}%"
        else
            echo "🎯 Reducción: 0.0%"
        fi
    else
        echo "⚠️  No se pudo obtener información de tamaños"
    fi
else
    echo "❌ Error al optimizar el PDF"
    exit 1
fi

echo ""
echo "💡 Para generar thumbnail:"
echo "convert \"$OUTPUT_FILE[0]\" -quality 85 -resize 300x400 \"${OUTPUT_FILE%.*}_thumbnail.jpg\""
