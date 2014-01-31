package com.tomayac.warczenschwein;

import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.Charset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.io.IOUtils;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.conf.Configured;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.SequenceFile.CompressionType;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.io.compress.GzipCodec;
import org.apache.hadoop.mapred.FileInputFormat;
import org.apache.hadoop.mapred.FileOutputFormat;
import org.apache.hadoop.mapred.JobClient;
import org.apache.hadoop.mapred.JobConf;
import org.apache.hadoop.mapred.MapReduceBase;
import org.apache.hadoop.mapred.Mapper;
import org.apache.hadoop.mapred.OutputCollector;
import org.apache.hadoop.mapred.Reporter;
import org.apache.hadoop.mapred.SequenceFileOutputFormat;
import org.apache.hadoop.mapred.lib.IdentityReducer;
import org.apache.hadoop.util.Tool;
import org.apache.hadoop.util.ToolRunner;
import org.apache.log4j.Logger;
import org.archive.io.ArchiveRecord;
import org.archive.io.ArchiveRecordHeader;

import uk.bl.wa.hadoop.ArchiveFileInputFormat;
import uk.bl.wa.hadoop.WARCRecordUtils;
import uk.bl.wa.hadoop.WritableArchiveRecord;

/**
 * Find video-tags in a WARC dataset
 * 
 * @author Thomas Steiner <tomac@google.com>
 * @author Hannes Muehleisen <hannes@cwi.nl>
 */
public class TagTool extends Configured implements Tool {

	private static final Logger LOG = Logger.getLogger(TagTool.class);

	// some Hannes-TM HTTP header parsing kludges, way faster than libs
	public static String headerValue(String[] headers, String key, String dflt) {
		for (String hdrLine : headers) {
			if (hdrLine.toLowerCase().trim().startsWith(key.toLowerCase())) {
				return hdrLine.trim();
			}
		}
		return dflt;
	}

	public static String headerKeyValue(String[] headers, String key,
			String dflt) {
		String line = headerValue(headers, key, null);
		if (line == null)
			return dflt;
		String[] pces = line.split(":");
		if (pces.length != 2)
			return dflt;
		return pces[1].trim();
	}

	public static class TagToolMapper extends MapReduceBase implements
			Mapper<Text, WritableArchiveRecord, Text, Text> {

		// create a counter group for Mapper-specific statistics
		private final String _counterGroup = "Custom Mapper Counters";

		private Pattern videoRegex = Pattern.compile(
				"<video[^>]*>(.*?)</video>", Pattern.CASE_INSENSITIVE
						| Pattern.MULTILINE);

		public void map(Text key, WritableArchiveRecord value,
				OutputCollector<Text, Text> output, Reporter reporter)
				throws IOException {

			try {
				ArchiveRecord record = value.getRecord();
				ArchiveRecordHeader header = record.getHeader();

				// WARC contains lots of stuff. We only want HTTP responses
				if (!header.getMimetype().equals(
						"application/http; msgtype=response")) {
					reporter.incrCounter(this._counterGroup,
							"Not a WARC Response", 1);
					return;
				}
				if (header.getLength() > (5 * 1024 * 1024)) {
					reporter.incrCounter(this._counterGroup,
							"Skipped - Too long", 1);
					return;
				}

				// validate URL
				URI uri = new URI(header.getUrl());
				String host = uri.getHost();
				if (host == null) {
					reporter.incrCounter(this._counterGroup, "Invalid URI", 1);
					return;
				}

				String headers[] = WARCRecordUtils.getHeaders(record, true)
						.split("\n");
				if (headers.length < 1) {
					reporter.incrCounter(this._counterGroup, "No headers", 1);
					return;
				}

				// only HTTP status 200 is interesting
				if (headerValue(headers, "HTTP/", null) == null) {
					LOG.info(IOUtils.toString(record));
					reporter.incrCounter(this._counterGroup, "Status != 200", 1);
					return;
				}
				reporter.incrCounter(this._counterGroup, "HTTP Success", 1);

				// only consider HTML responses
				String contentType = headerKeyValue(headers, "Content-Type",
						"text/html");
				if (!contentType.contains("html")) {
					reporter.incrCounter(this._counterGroup,
							"Skipped - Not HTML", 1);
					return;
				}

				// find charset from content-type, quick and dirty parser
				Charset cs = Charset.defaultCharset();
				try {
					String[] ctPces = contentType.split(";");
					if (ctPces.length == 2) {
						String csName = ctPces[1].toLowerCase()
								.replace("charset=", "").replace("\"", "")
								.trim();
						cs = Charset.forName(csName);
					}
				} catch (Exception e) {
					// http://homepages.cwi.nl/~hannes/whatever.gif
				}

				// read warc payload with correct encoding
				InputStreamReader inputReader = new InputStreamReader(
						WARCRecordUtils.getPayload(record), cs);
				Matcher videoMatch = videoRegex.matcher(IOUtils
						.toString(inputReader));

				// run regex
				while (videoMatch.find()) {
					reporter.incrCounter(this._counterGroup,
							"<video> tag found", 1);
					String videoTag = videoMatch.group(0);
					output.collect(new Text(uri.toString()), new Text(videoTag));
				}

			} catch (Throwable e) {
				if (e.getClass().equals(OutOfMemoryError.class))
					System.gc();

				reporter.incrCounter(this._counterGroup,
						"Skipped - Exception Thrown", 1);
			}
		}
	}

	/**
	 * Implementation of Tool.run() method, which builds and runs the Hadoop
	 * job.
	 * 
	 * @param args
	 *            command line parameters, less common Hadoop job parameters
	 *            stripped out and interpreted by the Tool class.
	 * @return 0 if the Hadoop job completes successfully, 1 if not.
	 */
	public int run(String[] args) throws Exception {
		if (args.length < 2) {
			System.out.println("TagTool <inDir> <outDir> [<config>]");
			ToolRunner.printGenericCommandUsage(System.out);
			return -1;
		}

		String inputPath = args[0];
		String outputPath = args[1];

		if (args.length >= 3) {
			String configFile = args[2];
			LOG.info("adding config parameters from '" + configFile + "'");
			this.getConf().addResource(configFile);
		}

		JobConf job = new JobConf(getConf(), TagTool.class);
		job.setMapperClass(TagTool.TagToolMapper.class);
		job.setReducerClass(IdentityReducer.class);
		job.setJobName("warczenschwein-tagtool");
		job.set("mapred.max.map.failures.percent", "10");

		job.setInputFormat(ArchiveFileInputFormat.class);
		FileInputFormat.setInputPaths(job, inputPath);

		SequenceFileOutputFormat.setOutputCompressionType(job,
				CompressionType.BLOCK);
		SequenceFileOutputFormat.setOutputCompressorClass(job, GzipCodec.class);

		job.setOutputFormat(SequenceFileOutputFormat.class);
		job.setOutputKeyClass(Text.class);
		job.setOutputValueClass(Text.class);
		FileOutputFormat.setOutputPath(job, new Path(outputPath));

		if (JobClient.runJob(job).isSuccessful())
			return 0;
		else
			return 1;
	}

	public static void main(String[] args) throws Exception {
		int res = ToolRunner.run(new Configuration(), new TagTool(), args);
		System.exit(res);
	}
}
